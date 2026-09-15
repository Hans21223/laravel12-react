<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Database\Connection;
use RuntimeException;

/** Maintenance-only copy with row-by-row verification. Never modifies the source. */
class DatabaseTransfer
{
    public const WORKSPACE_TABLES = ['approval_requests', 'approval_events', 'approval_notifications', 'approval_steps', 'approval_attachments'];

    public function copy(Connection $source, Connection $target, array $tables): array
    {
        $counts = [];
        $target->getSchemaBuilder()->disableForeignKeyConstraints();
        try {
            $target->transaction(function () use ($source, $target, $tables, &$counts) {
                foreach ($tables as $table) {
                    if (! preg_match('/^[a-z_]+$/', $table)) {
                        throw new RuntimeException('Invalid table.');
                    }
                    $columns = collect($target->getSchemaBuilder()->getColumns($table))->keyBy('name');
                    $target->table($table)->delete();
                    $rows = $source->table($table)->get();
                    foreach ($rows as $row) {
                        $values = (array) $row;
                        foreach ($values as $key => &$value) {
                            $type = $columns[$key]['type_name'] ?? '';
                            if ($value !== null && in_array($type, ['timestamp', 'datetime'])) {
                                $value = Carbon::parse($value)->utc()->format('Y-m-d H:i:s');
                            }
                        }
                        unset($value);
                        $target->table($table)->insert($values);
                    }
                    // Compare canonical values: MySQL decimal padding and JSON whitespace differ.
                    $canonical = function ($row) use ($columns) {
                        $values = (array) $row;
                        ksort($values);
                        foreach ($values as $key => &$value) {
                            $type = $columns[$key]['type_name'] ?? '';
                            if ($value === null) {
                                continue;
                            }
                            if (in_array($type, ['timestamp', 'datetime'])) {
                                $value = Carbon::parse($value)->utc()->format('Y-m-d H:i:s');
                            } elseif (in_array($type, ['decimal', 'double', 'float', 'real'])) {
                                $value = (string) (float) $value;
                            } elseif ($type === 'json') {
                                $value = json_decode($value, true, flags: JSON_THROW_ON_ERROR);
                                if (is_array($value)) {
                                    ksort($value);
                                }
                            } else {
                                $value = (string) $value;
                            }
                        }

                        return hash('sha256', json_encode($values, JSON_THROW_ON_ERROR));
                    };
                    $expected = $rows->map($canonical)->sort()->values()->all();
                    $actual = $target->table($table)->get()->map($canonical)->sort()->values()->all();
                    if ($expected !== $actual) {
                        throw new RuntimeException('Copy verification failed for '.$table);
                    }
                    $counts[$table] = count($actual);
                }
            });
        } finally {
            $target->getSchemaBuilder()->enableForeignKeyConstraints();
        }

        return $counts;
    }
}
