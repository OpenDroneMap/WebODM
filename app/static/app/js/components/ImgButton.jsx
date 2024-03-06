import React from 'react';

function ImgButton( {src, props, textNode} ) {
    return (<div {...props}>
        <img src={{src}} id="btn-img"></img>
        {textNode}
    </div>)
}

export default ImgButton;