import React from 'react';
import { shallow } from 'enzyme';
import ImportTaskPanel from '../ImportTaskPanel';

describe('<ImportTaskPanel />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<ImportTaskPanel projectId={0} onImported={() => {}} />);
    expect(wrapper.exists()).toBe(true);
  })
});