import React from 'react';
import { shallow } from 'enzyme';
import SharePopup from '../SharePopup';
const taskMock = require('../../tests/utils/MockLoader').load("task.json");

describe('<SharePopup />', () => {
  it('renders without exploding', () => {
  	const wrapper = shallow(<SharePopup task={taskMock} linksTarget="map" />);
    expect(wrapper.exists()).toBe(true);
  })
});