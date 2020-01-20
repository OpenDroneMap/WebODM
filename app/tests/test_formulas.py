import re
from django.test import TestCase
from app.api.formulas import lookup_formula, get_algorithm_list, get_camera_filters_for, algos

class TestFormulas(TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_formulas(self):
        # Original
        self.assertTrue(lookup_formula("_TESTRB", "RGB")[0] == "b1+b3")
        self.assertTrue(lookup_formula("_TESTRB", "RGB")[1] == (0, 1))

        # Swap bands
        self.assertTrue(lookup_formula("_TESTRB", "BGR")[0] == "b3+b1")
        self.assertTrue(lookup_formula("_TESTRB", "NRB")[0] == "b2+b3")

        # Not enough info
        self.assertRaises(ValueError, lookup_formula, "_TESTRB", "NRG")

        # Functions work
        self.assertTrue(lookup_formula("_TESTFUNC", "RGB")[0] == "b1+(sqrt(b3))")
        self.assertTrue(lookup_formula("_TESTFUNC", "RGB")[1] == None)

    def test_algo_list(self):
        al = get_algorithm_list()

        pattern = re.compile("([A-Z]+?[a-z]*)")
        for i in al:
            # Do not show test algos
            self.assertFalse(i['id'].startswith("_"))

            # Filters are less than 3 bands
            for f in i['filters']:
                bands = list(set(re.findall(pattern, f)))
                self.assertTrue(len(bands) <= 3)

        self.assertTrue(get_camera_filters_for(algos['VARI']) == ['RGB'])

        # Request algorithms with more band filters
        al = get_algorithm_list(max_bands=5)

        pattern = re.compile("([A-Z]+?[a-z]*)")
        for i in al:
            # Filters are less than 5 bands
            for f in i['filters']:
                bands = list(set(re.findall(pattern, f)))
                self.assertTrue(len(bands) <= 5)