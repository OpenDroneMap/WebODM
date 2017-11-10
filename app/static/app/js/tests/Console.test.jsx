import React from 'react';
import { shallow } from 'enzyme';
import Console from '../Console';

describe('<Console />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<Console />);
    expect(wrapper.exists()).toBe(true);
  })
});