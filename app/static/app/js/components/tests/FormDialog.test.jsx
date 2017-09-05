import React from 'react';
import { shallow } from 'enzyme';
import FormDialog from '../FormDialog';

describe('<FormDialog />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<FormDialog bind={[new MockComponent(), 'error']} />);
    expect(wrapper.exists()).toBe(true);
  })
});