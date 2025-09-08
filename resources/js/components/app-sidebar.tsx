import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { 
    FolderOpen, 
    LayoutGrid,
    Building2,
    Users
} from 'lucide-react';
import AppLogo from './app-logo';

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;

    const getNavItemsForUser = (): NavItem[] => {
        const baseItems: NavItem[] = [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
            {
                title: 'Projects',
                href: '/projects',
                icon: FolderOpen,
            },
        ];

        if (user.role === 'superadmin') {
            // Superadmins can access all features
            return [
                ...baseItems,
                {
                    title: 'Firms',
                    href: '/firms',
                    icon: Building2,
                },
                {
                    title: 'Users',
                    href: '/users',
                    icon: Users,
                },
            ];
        } else {
            // Regular users can only access their own firm
            return [
                ...baseItems,
                {
                    title: 'My Firm',
                    href: `/firms/${user.firm_id}`,
                    icon: Building2,
                },
            ];
        }
    };

    const mainNavItems = getNavItemsForUser();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
