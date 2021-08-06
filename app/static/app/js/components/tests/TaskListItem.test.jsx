import React from 'react';
import { shallow } from 'enzyme';
import TaskListItem from '../TaskListItem';
import createHistory from 'history/createBrowserHistory';
const taskMock = require('../../tests/utils/MockLoader').load("task.json");

describe('<TaskListItem />', () => {
  it('renders without exploding', () => {
  	const wrapper = shallow(<TaskListItem history={createHistory()} data={taskMock} hasPermission={() => true} />);
    expect(wrapper.exists()).toBe(true);
  })
});