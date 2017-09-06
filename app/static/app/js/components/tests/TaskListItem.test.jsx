import React from 'react';
import { shallow } from 'enzyme';
import TaskListItem from '../TaskListItem';

const taskMock = require('../../tests/utils/MockLoader').load("task.json");

describe('<TaskListItem />', () => {
  it('renders without exploding', () => {
	// TODO: load history mock
  	const wrapper = shallow(<TaskListItem history={{}} data={taskMock} />);
    expect(wrapper.exists()).toBe(true);
  })
});