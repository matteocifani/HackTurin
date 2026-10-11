/** Application frame: collapsible sidebar with the navigation, header with breadcrumb and actions, content area. Part of the IAMAimpresa design system. */
'use client'

import { Fragment, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'

import { ChevronRightIcon, MenuIcon } from 'lucide-react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export type AppShellNavItem = {
  title: string
  icon: ComponentType<{ className?: string }>
  isActive?: boolean
  onSelect?: () => void

  shortTitle?: string

  badge?: string | number
}

export type AppShellCrumb = {
  label: string
  icon?: ComponentType<{ className?: string }>
  onSelect?: () => void
}

type AppShellProps = {
  brand: ReactNode

  logotipo?: ReactNode

  homeNav?: AppShellNavItem
  groupLabel?: string
  nav: AppShellNavItem[]

  secondaryNav?: AppShellNavItem[]
  secondaryLabel?: string

  trail?: AppShellCrumb[]

  current: string

  headerActions?: ReactNode

  footer?: ReactNode

  contenutoPieno?: boolean
  children: ReactNode
}

function NavEntry({ item }: { item: AppShellNavItem }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={item.title} isActive={item.isActive} onClick={item.onSelect}>
        <item.icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
      {item.badge != null && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  )
}

function TabButton({
  label,
  title,
  icon: Icon,
  active,
  onSelect,
}: {
  label: string
  title: string
  icon: ComponentType<{ className?: string }>
  active?: boolean
  onSelect?: () => void
}) {
  return (
    <button
      type='button'
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      aria-label={label === title ? undefined : title}
      className='focus-visible:ring-ring flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 pt-2 pb-1.5 focus-visible:ring-2 focus-visible:outline-hidden'
    >
      <span
        data-active={active}
        className='text-muted-foreground data-[active=true]:bg-selected data-[active=true]:text-selected-foreground flex h-6 w-11 items-center justify-center rounded-md transition-colors [&>svg]:size-4.5'
      >
        <Icon />
      </span>
      <span
        data-active={active}
        className='text-muted-foreground data-[active=true]:text-selected-foreground w-full truncate text-center text-3xs leading-none data-[active=true]:font-medium'
      >
        {label}
      </span>
    </button>
  )
}

function MarchioDelRail({ marchio, logotipo }: { marchio: ReactNode; logotipo: ReactNode }) {
  return (
    <>
      <span
        data-slot='app-shell-marchio'
        className={cn(
          'invisible flex w-0 shrink-0 scale-90 items-center justify-center overflow-hidden opacity-0',
          'transition-[width,opacity,transform,visibility] duration-(--duration-swap) ease-(--ease-in)',
          'group-data-[collapsible=icon]:visible group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:scale-100 group-data-[collapsible=icon]:opacity-100',
          'group-data-[collapsible=icon]:duration-(--duration-fast) group-data-[collapsible=icon]:delay-(--duration-swap) group-data-[collapsible=icon]:ease-(--ease-out)',
          'motion-reduce:transition-none'
        )}
      >
        {marchio}
      </span>
      <span
        data-slot='app-shell-logotipo'
        className={cn(
          'flex min-w-0 items-center',
          'transition-[opacity,transform,visibility] delay-(--duration-swap) duration-(--duration-fast) ease-(--ease-out)',
          'group-data-[collapsible=icon]:invisible group-data-[collapsible=icon]:-translate-x-1 group-data-[collapsible=icon]:opacity-0',
          'group-data-[collapsible=icon]:delay-0 group-data-[collapsible=icon]:duration-(--duration-swap) group-data-[collapsible=icon]:ease-(--ease-in)',
          'motion-reduce:transition-none'
        )}
      >
        {logotipo}
      </span>
    </>
  )
}

function MobileTabBar({ items }: { items: AppShellNavItem[] }) {
  const { openMobile, toggleSidebar } = useSidebar()
  return (
    <nav
      aria-label='Navigazione rapida'
      className={cn(
        'bg-card fixed inset-x-3 z-(--z-overlay) flex rounded-xl border shadow-lg sm:hidden',

        'supports-[backdrop-filter]:bg-card/80 supports-[backdrop-filter]:backdrop-blur-md'
      )}

      style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {items.map(item => (
        <TabButton
          key={item.title}
          label={item.shortTitle ?? item.title}
          title={item.title}
          icon={item.icon}
          active={item.isActive}
          onSelect={item.onSelect}
        />
      ))}
      <TabButton
        label='Menu'
        title='Apri il menu'
        icon={MenuIcon}
        active={openMobile}
        onSelect={toggleSidebar}
      />
    </nav>
  )
}

const AppShell = ({
  brand,
  logotipo,
  homeNav,
  groupLabel,
  nav,
  secondaryNav,
  secondaryLabel = 'Altri moduli',
  trail,
  current,
  headerActions,
  footer,
  contenutoPieno = false,
  children,
}: AppShellProps) => {
  const [othersOpen, setOthersOpen] = useState(() => (secondaryNav ?? []).some(i => i.isActive))

  const tabItems = [...(homeNav ? [homeNav] : []), ...nav].slice(0, 4)

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '17.5rem',
          '--sidebar-width-icon': '3rem',

          '--shell-margine': '0.5rem',
        } as CSSProperties
      }
    >
      <Sidebar variant='floating' collapsible='icon' className='[&>[data-slot=sidebar-inner]]:rounded-xl'>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size='lg'
                className={cn('gap-2.5 !bg-transparent', logotipo != null && 'gap-0')}
                asChild
              >
                <div>{logotipo != null ? <MarchioDelRail marchio={brand} logotipo={logotipo} /> : brand}</div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {homeNav && (
            <SidebarGroup className='pb-0'>
              <SidebarGroupContent>
                <SidebarMenu>
                  <NavEntry item={homeNav} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          <SidebarGroup>
            {groupLabel && <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map(item => (
                  <NavEntry key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {secondaryNav && secondaryNav.length > 0 && (
            <SidebarGroup className='pt-0'>
              <SidebarGroupContent>
                <SidebarMenu>
                  <Collapsible open={othersOpen} onOpenChange={setOthersOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={secondaryLabel} className='text-sidebar-foreground/70'>
                          <ChevronRightIcon
                            data-open={othersOpen}
                            className='transition-transform duration-(--duration-fast) data-[open=true]:rotate-90'
                          />
                          <span>{secondaryLabel}</span>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {secondaryNav.map(item => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton asChild isActive={item.isActive}>
                                <button
                                  type='button'
                                  onClick={item.onSelect}
                                  className='w-full cursor-pointer'
                                >
                                  <item.icon />
                                  <span>{item.title}</span>

                                  {item.badge != null && (
                                    <span className='text-sidebar-foreground/70 ms-auto text-xs font-medium tabular-nums'>
                                      {item.badge}
                                    </span>
                                  )}
                                </button>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        {footer && <SidebarFooter>{footer}</SidebarFooter>}
      </Sidebar>
      <SidebarInset>
        <header className='border-border flex h-14 items-center gap-2 border-b px-4 max-sm:h-12'>
          <SidebarTrigger className='max-sm:hidden' />
          <Separator orientation='vertical' className='h-4 max-sm:hidden' />

          <Breadcrumb className='min-w-0 overflow-hidden'>
            <BreadcrumbList className='flex-nowrap'>
              {(trail ?? []).map((crumb, i) => (
                <Fragment key={crumb.label}>
                  <BreadcrumbItem className='shrink-0'>
                    <BreadcrumbLink
                      onClick={crumb.onSelect}
                      className={crumb.onSelect ? 'cursor-pointer' : undefined}
                      aria-label={crumb.icon ? crumb.label : undefined}
                    >
                      {crumb.icon ? <crumb.icon className='size-4' /> : crumb.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>

                  <BreadcrumbSeparator
                    className={i === (trail ?? []).length - 1 ? 'max-sm:hidden' : undefined}
                  />
                </Fragment>
              ))}
              <BreadcrumbItem className='min-w-0 max-sm:hidden'>
                <BreadcrumbPage className='truncate'>{current}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {headerActions && <div className='ms-auto flex items-center gap-1.5'>{headerActions}</div>}
        </header>

        <div
          className={cn(
            contenutoPieno
              ? 'flex h-[calc(100dvh-3.5rem)] flex-col overflow-y-auto max-sm:h-[calc(100dvh-3rem)]'
              : 'space-y-6 p-4 max-sm:space-y-4 max-sm:px-3 max-sm:pt-3 md:p-6 sm:pb-[max(1rem,calc(var(--flottanti-riserva,0px)-var(--shell-margine,0.5rem)))] md:pb-[max(1.5rem,calc(var(--flottanti-riserva,0px)-var(--shell-margine,0.5rem)))]',

            tabItems.length > 0 && 'max-sm:pb-[calc(5.5rem+env(safe-area-inset-bottom))]'
          )}
        >
          {children}
        </div>
        {tabItems.length > 0 && <MobileTabBar items={tabItems} />}
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AppShell
