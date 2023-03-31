import React from 'react';
import { shallow } from 'enzyme';
import SortPanel from '../SortPanel';

var sortItems = [{
    key: "created_at",
    label: "Created on"
}];

describe('<SortPanel />', () => {
  it('renders without exploding', () => {
  	const wrapper = shallow(<SortPanel items={sortItems} selected="created_at" />);
    expect(wrapper.exists()).toBe(true);
  })
});