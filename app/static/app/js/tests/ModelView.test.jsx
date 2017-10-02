import React from 'react';
import { shallow } from 'enzyme';
import ModelView from '../ModelView';
const taskMock = require('./utils/MockLoader').load("task.json");

describe('<ModelView />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<ModelView task={taskMock} />);
    expect(wrapper.exists()).toBe(true);
  })
});