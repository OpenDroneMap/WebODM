import React from 'react';
import { shallow } from 'enzyme';
import MapPreview from '../MapPreview';

describe('<MapPreview />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<MapPreview getFiles={() => []} />);
    expect(wrapper.exists()).toBe(true);
  })
});