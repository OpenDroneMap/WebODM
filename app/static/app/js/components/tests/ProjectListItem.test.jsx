import React from 'react';
import { shallow } from 'enzyme';
import ProjectListItem from '../ProjectListItem';
import createHistory from 'history/createBrowserHistory';
const projectMock = require('../../tests/utils/MockLoader').load("project.json");

describe('<ProjectListItem />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<ProjectListItem 
    	history={createHistory()} 
    	data={projectMock} />);
    expect(wrapper.exists()).toBe(true);
  })
});