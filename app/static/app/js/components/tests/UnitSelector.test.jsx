import React from 'react';
import { shallow } from 'enzyme';
import UnitSelector from '../UnitSelector';

describe('<UnitSelector />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<UnitSelector />);
    expect(wrapper.exists()).toBe(true);
  })
});