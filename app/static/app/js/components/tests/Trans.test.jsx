import React from 'react';
import { shallow } from 'enzyme';
import Trans from '../Trans';

describe('<Trans>Hello!</Trans>', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<Trans params={{a: "Test"}}>Hello %(a)s!</Trans>);
    expect(wrapper.exists()).toBe(true);
  })
});