// 为lucide-react组件添加类型支持
declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number;
  }
  
  export const Activity: FC<IconProps>;
  export const PieChart: FC<IconProps>;
  export const BarChart: FC<IconProps>;
  export const LineChart: FC<IconProps>;
  export const ChartBar: FC<IconProps>;
  export const Clock: FC<IconProps>;
  export const Save: FC<IconProps>;
  export const Trash: FC<IconProps>;
  export const HelpCircle: FC<IconProps>;
  export const Settings: FC<IconProps>;
  export const Eye: FC<IconProps>;
  export const Edit3: FC<IconProps>;
  export const Table: FC<IconProps>;
  export const ListChecks: FC<IconProps>;
  export const Image: FC<IconProps>;
  export const Cloud: FC<IconProps>;
  export const X: FC<IconProps>;
  export const Loader2: FC<IconProps>;
  export const Search: FC<IconProps>;
  export const Plus: FC<IconProps>;
  export const Tag: FC<IconProps>;
  export const Calendar: FC<IconProps>;
  export const Sun: FC<IconProps>;
  export const Moon: FC<IconProps>;
  export const Menu: FC<IconProps>;
  export const Star: FC<IconProps>;
  export const ChevronDown: FC<IconProps>;
  export const Share: FC<IconProps>;
  export const User: FC<IconProps>;
  export const FileText: FC<IconProps>;
  
  // 添加缺少的图标
  export const ChevronLeft: FC<IconProps>;
  export const ChevronRight: FC<IconProps>;
  export const XCircle: FC<IconProps>;
  
  // 编辑器相关图标
  export const Bold: FC<IconProps>;
  export const Italic: FC<IconProps>;
  export const List: FC<IconProps>;
  export const ListOrdered: FC<IconProps>;
  export const Link: FC<IconProps>;
  export const Code: FC<IconProps>;
  export const Quote: FC<IconProps>;
  export const Minus: FC<IconProps>;
  export const Maximize2: FC<IconProps>;
  export const Minimize2: FC<IconProps>;
  export const Upload: FC<IconProps>;
  export const Type: FC<IconProps>;
  export const Hash: FC<IconProps>;
  export const Hash1: FC<IconProps>;
  export const Hash2: FC<IconProps>;
  export const Hash3: FC<IconProps>;
} 