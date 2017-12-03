import React from 'react';
import { shallow } from 'enzyme';
import ClipboardInput from '../ClipboardInput';

describe('<ClipboardInput />', () => {
  it('renders without exploding', () => {
  	const wrapper = shallow(<ClipboardInput type="text" />);
    expect(wrapper.exists()).toBe(true);
  })
});