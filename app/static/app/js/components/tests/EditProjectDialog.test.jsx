import React from 'react';
import { shallow } from 'enzyme';
import EditProjectDialog from '../EditProjectDialog';

describe('<EditProjectDialog />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<EditProjectDialog 
             saveAction={() => {}}
        />);
    expect(wrapper.exists()).toBe(true);
  })
});