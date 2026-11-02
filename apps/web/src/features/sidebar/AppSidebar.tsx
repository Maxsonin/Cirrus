import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  EllipsisVerticalIcon,
  LogInIcon,
  LogOutIcon,
  SettingsIcon,
  SquarePenIcon,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { AuthDialog } from '@/features/auth/AuthDialog';
import { SettingsDialog } from '@/features/settings/SettingsDialog';
import { authClient } from '@/lib/auth-client';

import { ChatList } from './ChatList';

export function AppSidebar() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const { data: session } = authClient.useSession();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // On mobile the sidebar is a sheet over the page: close it after navigating.
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const signOut = async () => {
    await authClient.signOut();
    navigate('/');
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between pl-2">
            <span className="text-lg font-semibold">Cirrus</span>
            <SidebarTrigger />
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link to="/" onClick={closeOnMobile} />}
              >
                <SquarePenIcon />
                New chat
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {session && (
            <ChatList
              userId={session.user.id}
              activeChatId={chatId}
              onNavigate={closeOnMobile}
            />
          )}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {session ? (
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                    <Avatar size="sm">
                      <AvatarImage src={session.user.image ?? undefined} />
                      <AvatarFallback>
                        {initials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{session.user.name}</span>
                    <EllipsisVerticalIcon className="ml-auto" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" className="w-56">
                    <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                      <SettingsIcon />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut}>
                      <LogOutIcon />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ) : (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setSettingsOpen(true)}>
                    <SettingsIcon />
                    Settings
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setAuthOpen(true)}>
                    <LogInIcon />
                    Sign in
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}
