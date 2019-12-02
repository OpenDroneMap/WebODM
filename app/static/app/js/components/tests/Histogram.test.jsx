import React from 'react';
import { mount } from 'enzyme';
import Histogram from '../Histogram';

describe('<Histogram />', () => {
  it('renders without exploding', () => {
    const wrapper = mount(<Histogram statistics={{}} />);
    expect(wrapper.exists()).toBe(true);
  })
});