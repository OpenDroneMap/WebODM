import React from 'react';
import { shallow } from 'enzyme';
import ProjectPluginActionButtons from '../ProjectPluginActionButtons';
const projectMock = require('../../tests/utils/MockLoader').load("project.json");

describe('<ProjectPluginActionButtons />', () => {
  it('renders without exploding', () => {
  	const wrapper = shallow(<ProjectPluginActionButtons project={projectMock} />);
    expect(wrapper.exists()).toBe(true);
  })
});