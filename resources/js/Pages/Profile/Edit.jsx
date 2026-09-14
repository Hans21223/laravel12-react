import { Head } from '@inertiajs/react';

import AppLayout from '@/Layouts/AppLayout';
import DeleteUserForm from '@/Pages/Profile/Partials/DeleteUserForm';
import UpdatePasswordForm from '@/Pages/Profile/Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from '@/Pages/Profile/Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <AppLayout title="ACCOUNT_PROFILE" subtitle="จัดการข้อมูลบัญชีและความปลอดภัย">
            <Head title="โปรไฟล์" />

            <div className="grid gap-5 lg:grid-cols-2">
                <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
                <UpdatePasswordForm />

                <div className="lg:col-span-2">
                    <DeleteUserForm />
                </div>
            </div>
        </AppLayout>
    );
}
