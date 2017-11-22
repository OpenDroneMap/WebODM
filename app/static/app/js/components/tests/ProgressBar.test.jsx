import React from 'react';
import { shallow } from 'enzyme';
import ProgressBar from '../ProgressBar';

describe('<ProgressBar />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<ProgressBar current={2} total={100} template="Hello" />);
    expect(wrapper.exists()).toBe(true);
  })
});