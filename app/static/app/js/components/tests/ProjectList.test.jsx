import React from 'react';
import { shallow } from 'enzyme';
import ProjectList from '../ProjectList';

describe('<ProjectList />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<ProjectList history={{}} />);
    expect(wrapper.exists()).toBe(true);
  })
});