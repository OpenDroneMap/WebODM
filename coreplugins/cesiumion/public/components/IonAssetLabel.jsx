import React, { PureComponent, Fragment } from "react";
import { AssetConfig } from "../defaults";

const IonAssetLabel = ({ asset, showIcon = false, ...options }) => (
	<Fragment>
		{showIcon && <i className={`${AssetConfig[asset].icon}`} />}
		{"  "}
		{AssetConfig[asset].name}
	</Fragment>
);

export default IonAssetLabel;
