import React from 'react';
import { shallow } from 'enzyme';
import TagsField from '../TagsField';

describe('<TagsField />', () => {
  it('renders without exploding', () => {
  	const wrapper = shallow(<TagsField tags={["abc"]} />);
    expect(wrapper.exists()).toBe(true);
  })
});