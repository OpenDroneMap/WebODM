import React from 'react';
import { mount } from 'enzyme';
import Map from '../Map';
import sinon from 'sinon';

sinon.useFakeXMLHttpRequest();

describe('<Map />', () => {
  it('renders without exploding', () => {
    const wrapper = mount(<Map 
    	tiles={[]} />);

    expect(wrapper.exists()).toBe(true);
  })
});