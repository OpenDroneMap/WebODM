export default {
    setRefAndExtend: function(childInstance, parentClass, refName){
      return (domNode) => {
        childInstance[refName] = domNode;

        if (parentClass.inheritMethods && Array.isArray(parentClass.inheritMethods)){
          parentClass.inheritMethods
          // TODO: continue this 
        }
      };
    }
};

