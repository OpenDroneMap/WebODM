import React from 'react';
import { mount } from 'enzyme';
import MapPreview from '../MapPreview';

describe('<MapPreview />', () => {
  it('renders without exploding', () => {
    const wrapper = mount(<MapPreview getFiles={() => []} />);
    expect(wrapper.exists()).toBe(true);
  })
});