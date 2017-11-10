import React from 'react';
import { shallow } from 'enzyme';
import TaskList from '../TaskList';

describe('<TaskList />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<TaskList history={{}} source="tasklist.json" />);
    expect(wrapper.exists()).toBe(true);
  })
});