import React from 'react';
import { shallow } from 'enzyme';
import Map from '../Map';

describe('<Map />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<Map 
    	tiles={['/tiles.json']} />);

    // TODO: componentDidUpdate method is never called

    expect(wrapper.exists()).toBe(true);
  })
});