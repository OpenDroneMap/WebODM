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
        list = get_algorithm_list()

        # Do not show test algos
        for i in list:
            self.assertFalse(i['id'].startswith("_"))

        self.assertTrue(get_camera_filters_for(algos['VARI']) == ['RGB'])