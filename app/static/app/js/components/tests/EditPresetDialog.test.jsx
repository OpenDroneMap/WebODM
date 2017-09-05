import React from 'react';
import { shallow } from 'enzyme';
import EditPresetDialog from '../EditPresetDialog';

describe('<EditPresetDialog />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<EditPresetDialog 
             
        />);
    expect(wrapper.exists()).toBe(true);
  })
});