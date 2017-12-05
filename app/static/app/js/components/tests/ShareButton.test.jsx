import React from 'react';
import { shallow } from 'enzyme';
import ShareButton from '../ShareButton';
const taskMock = require('../../tests/utils/MockLoader').load("task.json");

describe('<ShareButton />', () => {
  it('renders without exploding', () => {
  	const wrapper = shallow(<ShareButton task={taskMock} linksTarget="map" />);
    expect(wrapper.exists()).toBe(true);
  })
});