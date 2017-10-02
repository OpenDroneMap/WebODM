import React from 'react';
import { shallow } from 'enzyme';
import UploadProgressBar from '../UploadProgressBar';

describe('<UploadProgressBar />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<UploadProgressBar />);
    expect(wrapper.exists()).toBe(true);
  })
});