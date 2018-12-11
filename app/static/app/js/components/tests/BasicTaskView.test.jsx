import React from 'react';
import { mount } from 'enzyme';
import BasicTaskView from '../BasicTaskView';

describe('<BasicTaskView />', () => {
  it('renders without exploding', () => {
  	const wrapper = mount(<BasicTaskView source="http://localhost/output" taskStatus={40} />);
    expect(wrapper.exists()).toBe(true);
  })
});