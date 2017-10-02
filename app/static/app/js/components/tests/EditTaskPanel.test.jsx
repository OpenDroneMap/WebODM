import React from 'react';
import { shallow } from 'enzyme';
import EditTaskPanel from '../EditTaskPanel';

const taskMock = require('../../tests/utils/MockLoader').load("task.json");

describe('<EditTaskPanel />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<EditTaskPanel 
             task={taskMock}
             onSave={() => {}}
			 onCancel={() => {}}
        />);
    expect(wrapper.exists()).toBe(true);
  })
});