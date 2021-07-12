$(function () {
  var app = new Vue({
    el: "#app",
    i18n,
    data: {},
    methods: {},
    computed: {
      steps: function () {
        return [
          {
            img: "src/assets/images/img_step1.svg",
            title: this.$t("page_main.howIt1_title"),
            desc: this.$t("page_main.howIt1_desc"),
          },
          {
            img: "src/assets/images/img_step2.svg",
            title: this.$t("page_main.howIt2_title"),
            desc: this.$t("page_main.howIt2_desc"),
          },
          {
            img: "src/assets/images/img_step3.svg",
            title: this.$t("page_main.howIt3_title"),
            desc: this.$t("page_main.howIt3_desc"),
          },
        ];
      },
      features: function () {
        return [
          {
            img: "src/assets/images/ic-ortho.svg",
            title: this.$t("page_main.feature1_title"),
            desc: this.$t("page_main.feature1_desc"),
          },
          {
            img: "src/assets/images/ic-eleva.svg",
            title: this.$t("page_main.feature2_title"),
            desc: this.$t("page_main.feature2_desc"),
          },
          {
            img: "src/assets/images/ic-gis.svg",
            title: this.$t("page_main.feature3_title"),
            desc: this.$t("page_main.feature3_desc"),
          },
          {
            img: "src/assets/images/ic-3d.svg",
            title: this.$t("page_main.feature4_title"),
            desc: this.$t("page_main.feature4_desc"),
          },
          {
            img: "src/assets/images/ic-measure.svg",
            title: this.$t("page_main.feature5_title"),
            desc: this.$t("page_main.feature5_desc"),
          },
          {
            img: "src/assets/images/ic-drone.svg",
            title: this.$t("page_main.feature6_title"),
            desc: this.$t("page_main.feature6_desc"),
          },
        ];
      },
      prices: function () {
        return [
          {
            title: this.$t("page_main.price1_title"),
            value: this.$t("page_main.price1_value"),
            desc: this.$t("page_main.price1_desc"),
            btn: this.$t("page_main.tryIt_btn"),
            link:"http://dronebox.io/public/task/f989cbe1-86b3-46c5-8165-c000dd08a721/map/"
          },
          {
            title: this.$t("page_main.price2_title"),
            value: this.$t("page_main.price2_value"),
            desc: this.$t("page_main.price2_desc"),
            btn: this.$t("page_main.price2_value"),
            link:"mailto:mapedia.com@gmail.com"
          },
        ];
      },
    },
  });
});
