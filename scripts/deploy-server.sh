#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/Helldriver.csbootstrap.com/laravel12-react
[[ "$DEPLOY_SHA" =~ ^[a-f0-9]{40}$ ]]
[[ "$DEPLOY_STAGE" =~ ^/tmp/anaheim-[0-9]+-[0-9]+$ ]]
test "$(realpath "$app")" = "$app"
test -f "$app/artisan" && test -f "$app/.env"
cd "$app"

# Refuse unexpected code edits. File-mode-only differences from the initial
# classroom permission setup do not alter application source.
git -c core.fileMode=false diff --quiet
git -c core.fileMode=false diff --cached --quiet
git fetch https://github.com/Hans21223/laravel12-react.git main
git cat-file -e "$DEPLOY_SHA^{commit}"
git merge-base --is-ancestor HEAD "$DEPLOY_SHA"

backup="$(dirname "$app")/.anaheim-backups/$(date -u +%Y%m%dT%H%M%SZ)-${DEPLOY_SHA:0:12}"
install -d -m 700 "$backup"
export AE_BACKUP_DIR="$backup"
umask 077
# Keep the previous code, dependencies, configuration, and asset manifest.
tar --exclude=./node_modules --exclude=./storage --exclude='*.sqlite' \
    --exclude='*.sqlite-wal' --exclude='*.sqlite-shm' \
    -czf "$backup/application.tar.gz" .
git rev-parse HEAD > "$backup/previous-commit.txt"
umask 022
python3 "$DEPLOY_STAGE/scripts/configure-profile-uploads.py"

maintenance=0
on_failure() {
    echo "Deployment stopped. Recovery snapshot: $backup"
    if [[ "$maintenance" = 1 ]]; then
        echo 'Application remains in maintenance mode until deployment is repaired.'
    fi
}
trap on_failure ERR
php artisan down --retry=30
maintenance=1
php "$DEPLOY_STAGE/scripts/deploy-database.php" backup
git -c core.fileMode=false merge --ff-only "$DEPLOY_SHA"

# Preserve APP_KEY, database connection, and account credentials.
python3 - <<'PY'
from pathlib import Path
import re
path=Path('.env')
text=path.read_text()
settings={'APP_NAME':'"Anaheim Electronics"','APP_ENV':'production',
          'APP_DEBUG':'false','APP_URL':'https://helldriver.csbootstrap.com',
          'SESSION_SECURE_COOKIE':'true'}
for key,value in settings.items():
    pattern=r'^'+key+r'=.*$'
    text=re.sub(pattern,lambda _:key+'='+value,text,flags=re.M) if re.search(pattern,text,re.M) else text+'\n'+key+'='+value+'\n'
path.write_text(text)
PY

export COMPOSER_ALLOW_SUPERUSER=1
composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader
cp -a "$DEPLOY_STAGE/public/build/." public/build/
if test -f public/hot; then mv public/hot "$backup/vite-hot"; fi
php artisan config:clear
php artisan migrate --force
php "$DEPLOY_STAGE/scripts/deploy-database.php" provision
php artisan config:cache
php artisan route:cache
php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache
find storage bootstrap/cache -type d -exec chmod 775 {} +
find storage bootstrap/cache -type f -exec chmod 664 {} +
php "$DEPLOY_STAGE/scripts/deploy-database.php" permissions
php artisan up
maintenance=0
trap - ERR
echo "DEPLOYED_SHA=$DEPLOY_SHA"
echo "BACKUP_PATH=$backup"
