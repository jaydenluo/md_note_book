// 禁用默认右键菜单并设置自定义右键菜单
export function setupContextMenu() {
  // 禁用默认右键菜单
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
}

// 为特定元素添加自定义右键菜单
export function addCustomContextMenu(
  element: HTMLElement, 
  callback: (e: MouseEvent) => void
) {
  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    callback(e);
    return false;
  });
  
  // 返回清理函数
  return () => {
    element.removeEventListener('contextmenu', callback);
  };
}

// 创建一个简单的右键菜单
export function createContextMenu(
  x: number, 
  y: number, 
  items: { label: string; onClick: () => void }[]
): HTMLElement {
  // 创建菜单容器
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.position = 'fixed';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.backgroundColor = 'white';
  menu.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
  menu.style.borderRadius = '4px';
  menu.style.padding = '4px 0';
  menu.style.zIndex = '1000';
  
  // 添加菜单项
  items.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.textContent = item.label;
    menuItem.style.padding = '8px 16px';
    menuItem.style.cursor = 'pointer';
    menuItem.style.fontSize = '14px';
    
    menuItem.addEventListener('click', () => {
      item.onClick();
      document.body.removeChild(menu);
    });
    
    menuItem.addEventListener('mouseover', () => {
      menuItem.style.backgroundColor = '#f3f4f6';
    });
    
    menuItem.addEventListener('mouseout', () => {
      menuItem.style.backgroundColor = 'transparent';
    });
    
    menu.appendChild(menuItem);
  });
  
  // 点击其他地方关闭菜单
  const closeMenu = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('click', closeMenu);
    }
  };
  
  document.addEventListener('click', closeMenu);
  
  // 添加到文档
  document.body.appendChild(menu);
  
  return menu;
} 