import React from 'react';
import { shallow } from 'enzyme';
import Standby from '../Standby';

describe('<Standby />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<Standby />);
    expect(wrapper.exists()).toBe(true);
  })
});