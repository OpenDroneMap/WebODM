import React from 'react';
import { shallow } from 'enzyme';
import MapView from '../MapView';

describe('<MapView />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<MapView mapItems={[{mapType: "orthophoto", tiles: ["/tiles.json"]}]} />);
    expect(wrapper.exists()).toBe(true);
  })
});