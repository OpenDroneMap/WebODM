import React from 'react';
import { shallow } from 'enzyme';
import Paginator from '../Paginator';

describe('<Paginator />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<Paginator />);
    expect(wrapper.exists()).toBe(true);
  })
});