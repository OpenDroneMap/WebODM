import React from 'react';
import { shallow } from 'enzyme';
import TaskPluginActionButtons from '../TaskPluginActionButtons';
const taskMock = require('../../tests/utils/MockLoader').load("task.json");

describe('<TaskPluginActionButtons />', () => {
  it('renders without exploding', () => {
  	const wrapper = shallow(<TaskPluginActionButtons task={taskMock} />);
    expect(wrapper.exists()).toBe(true);
  })
});