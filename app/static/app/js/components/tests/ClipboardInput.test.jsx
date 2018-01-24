import React from 'react';
import { mount } from 'enzyme';
import ClipboardInput from '../ClipboardInput';

describe('<ClipboardInput />', () => {
  it('renders without exploding', () => {
  	const wrapper = mount(<ClipboardInput type="text" />);
    expect(wrapper.exists()).toBe(true);
  })
});