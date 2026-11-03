import { render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { ResourceViewTabs } from '../components/ResourceViewTabs';
import { dictionary } from './fixtures/classifications';
test('category names are visible beside icons while accessible names remain stable', () => {
 render(<ResourceViewTabs dictionary={dictionary} value="cores" onChange={vi.fn()} />);
 const group=screen.getByRole('group',{name:'游戏资源维度'});
 for(const name of ['全部','核心','特工','宠物','配件','收藏品','载具']) expect(within(group).getByRole('button',{name})).toHaveTextContent(name);
});
