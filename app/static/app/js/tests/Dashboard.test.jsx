import React from 'react';
import { shallow } from 'enzyme';
import Dashboard from '../Dashboard';

describe('<Dashboard />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<Dashboard permissions={['add_project']} />);
    expect(wrapper.exists()).toBe(true);
  })
});