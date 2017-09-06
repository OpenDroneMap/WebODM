import React from 'react';
import { shallow } from 'enzyme';
import Paginated from '../Paginated';

class MockComponent extends Paginated {
    render(){
        return <div/>;
    }
}

describe('<Paginated />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<MockComponent history={{}} />);
    expect(wrapper.exists()).toBe(true);
  })
});