import { PanelFrame } from '@/components/panel/PanelFrame';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PanelFrame>{children}</PanelFrame>;
}
