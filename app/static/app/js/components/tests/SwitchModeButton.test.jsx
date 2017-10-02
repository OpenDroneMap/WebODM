import React from 'react';
import { shallow } from 'enzyme';
import SwitchModeButton from '../SwitchModeButton';

describe('<SwitchModeButton />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<SwitchModeButton />);
    expect(wrapper.exists()).toBe(true);
  })
});