import React from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    Save, Trash2, User, Mail, Lock, Shield, Building2,
    Key, Phone, Briefcase
} from 'lucide-react';

interface User {
    id?: number;
    name: string;
    email: string;
    password?: string;
    password_confirmation?: string;
    firm_id: number | null;
    phone?: string;
    created_at?: string;
    updated_at?: string;
    firm?: any;
}

interface Firm {
    id: number;
    name: string;
    type?: string;
    status?: string;
}

interface Props {
    user?: User;
    firms?: Firm[];
}

export default function UserForm({ user, firms = [] }: Props) {
    const { auth } = usePage().props as any;

    const { data, setData, post, put, processing, errors } = useForm<any>({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        password: '',
        password_confirmation: '',
        firm_id: user?.firm_id || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user?.id) {
            post('/users', {
                preserveScroll: true,
                onSuccess: () => {
                    router.visit('/users');
                },
            });
        } else {
            put(`/users/${user.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    router.visit('/users');
                },
            });
        }
    };

    const handleDelete = () => {
        if (user?.id && confirm('Are you sure you want to delete this user?')) {
            router.delete(`/users/${user.id}`);
        }
    };

    const pageTitle = !user?.id ? 'New User' : data.name || 'User';
    
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Users', href: '/users' },
                { title: pageTitle }
            ]}
            headerActions={
                <div className="flex items-center gap-2">
                    {user?.id && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            className="h-6 text-xs px-2"
                        >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                        </Button>
                    )}
                    <Button
                        type="submit"
                        form="user-form"
                        size="sm"
                        disabled={processing}
                        className={cn(
                            "h-6 text-xs px-2 transition-all",
                            processing && "opacity-75"
                        )}
                    >
                        {processing ? (
                            <>
                                <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-3 w-3 mr-1" />
                                Save
                            </>
                        )}
                    </Button>
                </div>
            }
        >
            <Head title={pageTitle} />
            
            <form id="user-form" onSubmit={handleSubmit} className="p-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">User Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Profile Section */}
                        <div>
                            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Profile
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs">Name *</Label>
                                    <Input
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        className="h-8 text-sm"
                                        placeholder="John Doe"
                                        required
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                </div>
                                
                                <div>
                                    <Label className="text-xs">Email *</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="email"
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                            className="h-8 text-sm pl-8"
                                            placeholder="john@example.com"
                                            required
                                        />
                                    </div>
                                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                </div>
                                
                                <div>
                                    <Label className="text-xs">Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="tel"
                                            value={data.phone}
                                            onChange={e => setData('phone', e.target.value)}
                                            className="h-8 text-sm pl-8"
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <Label className="text-xs">Firm</Label>
                                    <Select
                                        value={data.firm_id?.toString() || 'none'}
                                        onValueChange={(value) => setData('firm_id', value === 'none' ? null : parseInt(value))}
                                    >
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Firm</SelectItem>
                                            {firms.map((firm) => (
                                                <SelectItem key={firm.id} value={firm.id.toString()}>
                                                    {firm.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.firm_id && <p className="text-red-500 text-xs mt-1">{errors.firm_id}</p>}
                                </div>
                            </div>
                        </div>
                        
                        <Separator />
                        
                        {/* Security Section */}
                        <div>
                            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Security
                                {user?.id && <span className="text-xs text-gray-500 font-normal">(Leave blank to keep current password)</span>}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs">Password</Label>
                                    <div className="relative">
                                        <Key className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="password"
                                            value={data.password}
                                            onChange={e => setData('password', e.target.value)}
                                            className="h-8 text-sm pl-8"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                                </div>
                                
                                <div>
                                    <Label className="text-xs">Confirm Password</Label>
                                    <div className="relative">
                                        <Key className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="password"
                                            value={data.password_confirmation}
                                            onChange={e => setData('password_confirmation', e.target.value)}
                                            className="h-8 text-sm pl-8"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    {errors.password_confirmation && <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </AppLayout>
    );
}