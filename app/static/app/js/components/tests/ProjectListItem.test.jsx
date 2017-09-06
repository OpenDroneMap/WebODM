import React from 'react';
import { shallow } from 'enzyme';
import ProjectListItem from '../ProjectListItem';

const projectMock = require('../../tests/utils/MockLoader').load("project.json");

describe('<ProjectListItem />', () => {
  it('renders without exploding', () => {
  	// TODO: load history mock
  	
    const wrapper = shallow(<ProjectListItem 
    	history={window.history} 
    	data={projectMock} />);
    expect(wrapper.exists()).toBe(true);
  })
});