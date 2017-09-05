import React from 'react';
import { shallow } from 'enzyme';
import AssetDownloadButtons from '../AssetDownloadButtons';

describe('<AssetDownloadButtons />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<AssetDownloadButtons task={{project: 1, id: 1, available_assets: ["orthophoto.tif", "dsm.tif"]}} />);
    expect(wrapper.exists()).toBe(true);
  })
});