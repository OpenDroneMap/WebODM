import React from 'react';
import { shallow } from 'enzyme';
import ProcessingNodeOption from '../ProcessingNodeOption';

describe('<ProcessingNodeOption />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<ProcessingNodeOption name="test" defaultValue={true} />);
    expect(wrapper.exists()).toBe(true);
  })
});